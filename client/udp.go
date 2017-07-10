package client

import (
	"time"
	"net"
	"github.com/skycoin/net/conn"
	"github.com/skycoin/net/msg"
	log "github.com/sirupsen/logrus"
	"encoding/binary"
)

type ClientUDPConn struct {
	conn.UDPConn
}

func NewClientUDPConn(c *net.UDPConn) *ClientUDPConn {
	return &ClientUDPConn{conn.UDPConn{UdpConn: c, In: make(chan []byte), Out: make(chan []byte), ConnCommonFields:conn.NewConnCommonFileds()}}
}

func (c *ClientUDPConn) ReadLoop() (err error) {
	defer func() {
		if err != nil {
			c.SetStatusToError(err)
		}
		if e := recover(); e != nil {
			log.Println(e)
			return
		}
		c.Close()
	}()
	for {
		maxBuf := make([]byte, conn.MAX_UDP_PACKAGE_SIZE)
		n, err := c.UdpConn.Read(maxBuf)
		if err != nil {
			return err
		}
		maxBuf = maxBuf[:n]

		switch maxBuf[msg.MSG_TYPE_BEGIN] {
		case msg.TYPE_PONG:
		case msg.TYPE_ACK:
			seq := binary.BigEndian.Uint32(maxBuf[msg.MSG_SEQ_BEGIN:msg.MSG_SEQ_END])
			c.DelMsg(seq)
			c.UpdateLastAck(seq)
		case msg.TYPE_NORMAL:
			seq := binary.BigEndian.Uint32(maxBuf[msg.MSG_SEQ_BEGIN:msg.MSG_SEQ_END])
			err = c.Ack(seq)
			if err != nil {
				return err
			}
			c.In <- maxBuf[msg.MSG_HEADER_END:]
		}
	}
	return nil
}

const (
	TICK_PERIOD = 60
)

func (c *ClientUDPConn) ping() error {
	b := make([]byte, msg.MSG_TYPE_SIZE)
	b[msg.MSG_TYPE_BEGIN] = msg.TYPE_PING
	return c.WriteBytes(b)
}

func (c *ClientUDPConn) WriteLoop() (err error) {
	ticker := time.NewTicker(time.Second * TICK_PERIOD)
	defer func() {
		ticker.Stop()
		if err != nil {
			c.SetStatusToError(err)
		}
	}()

	for {
		select {
		case <-ticker.C:
			log.Println("Ping out")
			err := c.ping()
			if err != nil {
				return err
			}
		case m, ok := <-c.Out:
			if !ok {
				log.Println("udp conn closed")
				return nil
			}
			log.Printf("msg out %x", m)
			err := c.Write(m)
			if err != nil {
				log.Printf("write msg is failed %v", err)
				return err
			}
		}
	}
}

func (c *ClientUDPConn) Write(bytes []byte) error {
	new := c.GetNextSeq()
	m := msg.New(msg.TYPE_NORMAL, new, bytes)
	c.AddMsg(new, m)
	return c.WriteBytes(m.Bytes())
}

func (c *ClientUDPConn) WriteBytes(bytes []byte) error {
	_, err := c.UdpConn.Write(bytes)
	return err
}

func (c *ClientUDPConn) Ack(seq uint32) error {
	resp := make([]byte, msg.MSG_SEQ_END)
	resp[msg.MSG_TYPE_BEGIN] = msg.TYPE_ACK
	binary.BigEndian.PutUint32(resp[msg.MSG_SEQ_BEGIN:], seq)
	return c.WriteBytes(resp)
}

